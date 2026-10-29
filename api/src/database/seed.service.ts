import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { Env } from '../config/env';
import { nowIso } from '../common/util';
import { AreaReview } from '../modules/areas/area-review.entity';
import { Area } from '../modules/areas/area.entity';
import { findOrCreateArea } from '../modules/areas/locations';
import { hashPassword } from '../modules/auth/auth.service';
import { Listing } from '../modules/listings/listing.entity';
import { User } from '../modules/users/user.entity';

// The original seed shipped invented condition ratings. They're gone: new areas start unrated, and any
// database still holding exactly these values (with no published resident reports) is reset on boot.
const LEGACY_DEMO_RATINGS = [
  ['yaba', 'Yaba', 'A lively, well-connected neighbourhood with universities, markets and a growing tech community.', 'Good', 'Fair', 'Good', 'Fair', 'Good', 'Good', 82],
  ['surulere', 'Surulere', 'A central residential area with strong transport links, shops and quiet residential streets.', 'Fair', 'Good', 'Good', 'Good', 'Good', 'Fair', 78],
  ['gbagada', 'Gbagada', 'A family-friendly area with a mix of estates and local streets.', 'Good', 'Good', 'Fair', 'Good', 'Fair', 'Good', 76],
  ['ikeja', 'Ikeja', 'Lagos’s administrative centre with established estates and major transport connections.', 'Good', 'Good', 'Good', 'Good', 'Good', 'Good', 86],
  ['lekki-phase-1', 'Lekki Phase 1', 'A coastal district with a wide range of homes, services and road connections.', 'Fair', 'Fair', 'Good', 'Fair', 'Fair', 'Good', 72],
] as const;

const LAGOS_AREAS: [slug: string, name: string, description: string][] = LEGACY_DEMO_RATINGS.map(([slug, name, description]) => [slug, name, description]);

// Places renters can browse. They carry no ratings: conditions read "No data" until residents report.
const PLACES: Record<string, string[]> = {
  Lagos: ['Victoria Island', 'Ikoyi', 'Ajah', 'Maryland', 'Ikorodu'],
  Abuja: ['Maitama', 'Wuse 2', 'Garki', 'Gwarinpa', 'Jabi'],
  'Port Harcourt': ['GRA Phase 2', 'Rumuola', 'Trans Amadi'],
  Ibadan: ['Bodija', 'Jericho', 'Ring Road'],
  Enugu: ['Independence Layout', 'New Haven'],
};

const DEMO_LISTINGS = [
  { area: 'yaba', title: 'Mini flat · Sabo, Yaba', description: 'Bright mini flat with prepaid meter and secure compound.', address: '12 Akinola Street, Sabo', propertyType: 'Mini flat', bedrooms: 1, bathrooms: 1, rent: 1_800_000, agencyFee: 180_000, legalFee: 180_000, cautionDeposit: 200_000, serviceCharge: 0, features: ['Prepaid meter', 'Secure compound'] },
  { area: 'surulere', title: '2-bedroom flat · Surulere', description: 'Well-kept two-bedroom flat in a gated compound.', address: '4 Adeniran Ogunsanya, Surulere', propertyType: '2-bedroom flat', bedrooms: 2, bathrooms: 2, rent: 3_200_000, agencyFee: 320_000, legalFee: 320_000, cautionDeposit: 350_000, serviceCharge: 200_000, features: ['Prepaid meter', 'Gated compound'] },
  { area: 'gbagada', title: '2-bedroom flat · Gbagada', description: 'Comfortable flat with parking and reliable water supply.', address: '18 Diya Street, Gbagada Phase 2', propertyType: '2-bedroom flat', bedrooms: 2, bathrooms: 2, rent: 2_800_000, agencyFee: 280_000, legalFee: 280_000, cautionDeposit: 300_000, serviceCharge: 180_000, features: ['Parking available', 'Prepaid meter'] },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    @InjectRepository(Area) private readonly areas: Repository<Area>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
    @InjectRepository(AreaReview) private readonly reviews: Repository<AreaReview>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdmin();
    // Cities and neighbourhoods are reference data, so they exist everywhere.
    await this.seedAreas();
    await this.seedPlaces();
    // Sample listings and a demo landlord are for local development and staging only.
    if (this.config.get('SEED_DEMO_DATA', { infer: true }) && (await this.listings.count()) === 0) {
      await this.seedListings();
    }
  }

  private async seedAdmin(): Promise<void> {
    const email = this.config.get('ADMIN_EMAIL', { infer: true })?.trim().toLowerCase();
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    if (!email || !password || (await this.users.existsBy({ email }))) return;
    await this.users.save(
      this.users.create({
        name: 'AreaScout Administrator',
        email,
        role: 'admin',
        passwordHash: await hashPassword(password),
        verified: true,
        createdAt: nowIso(),
      }),
    );
    this.logger.log(`Created admin account ${email}`);
  }

  /** Lagos neighbourhoods the demo listings sit in. Conditions read "No data" until residents report. */
  private async seedAreas(): Promise<void> {
    for (const [slug, name, description] of LAGOS_AREAS) {
      if (await this.areas.existsBy({ slug })) continue;
      await this.areas.save(this.areas.create({ slug, name, description, city: 'Lagos', updatedAt: nowIso() }));
    }
    await this.resetLegacyDemoRatings();
  }

  private async resetLegacyDemoRatings(): Promise<void> {
    for (const [slug, , , power, flooding, security, water, transport, internet, score] of LEGACY_DEMO_RATINGS) {
      const area = await this.areas.findOneBy({ slug });
      if (!area || area.score !== score || area.power !== power || area.flooding !== flooding || area.security !== security || area.water !== water || area.transport !== transport || area.internet !== internet) continue;
      if (await this.reviews.countBy({ areaId: area.id, status: 'published' })) continue;
      await this.areas.update(area.id, { power: 'No data', flooding: 'No data', security: 'No data', water: 'No data', transport: 'No data', internet: 'No data', score: 0, updatedAt: nowIso() });
      this.logger.log(`Cleared demo ratings for ${area.name}`);
    }
  }

  private async seedPlaces(): Promise<void> {
    for (const [city, names] of Object.entries(PLACES)) {
      for (const name of names) await findOrCreateArea(this.areas, city, name);
    }
  }

  private async seedListings(): Promise<void> {
    // Demo owner gets an unguessable password: it exists only to own the sample rows.
    const owner = await this.users.save(
      this.users.create({
        name: 'AreaScout Demo Landlord',
        email: 'demo-landlord@areascout.local',
        role: 'landlord',
        passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
        verified: true,
        createdAt: nowIso(),
      }),
    );
    for (const { area: slug, ...d } of DEMO_LISTINGS) {
      const area = await this.areas.findOneByOrFail({ slug });
      await this.listings.save(
        this.listings.create({ ...d, areaId: area.id, ownerId: owner.id, utilities: 0, photos: [], rentPeriod: 'year', verified: true, status: 'live', createdAt: nowIso(), updatedAt: nowIso() }),
      );
    }
  }
}
