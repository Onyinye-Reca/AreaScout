import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nowIso } from '../../common/util';
import { Listing } from '../listings/listing.entity';
import { toListingView } from '../listings/listings.service';
import { User } from '../users/user.entity';
import { SavedListing } from './saved-listing.entity';

@Injectable()
export class SavedService {
  constructor(
    @InjectRepository(SavedListing) private readonly saved: Repository<SavedListing>,
    @InjectRepository(Listing) private readonly listings: Repository<Listing>,
  ) {}

  async list(user: User) {
    const rows = await this.saved.find({
      where: { userId: user.id },
      relations: { listing: { area: true, owner: true } },
      order: { createdAt: 'DESC' },
    });
    return { listings: rows.filter((r) => r.listing.status === 'live').map((r) => toListingView(r.listing)) };
  }

  async add(user: User, listingId: number) {
    if (!(await this.listings.existsBy({ id: listingId, status: 'live' }))) {
      throw new NotFoundException('Listing not found');
    }
    await this.saved.upsert({ userId: user.id, listingId, createdAt: nowIso() }, ['userId', 'listingId']);
    return { saved: true };
  }

  async remove(user: User, listingId: number) {
    await this.saved.delete({ userId: user.id, listingId });
    return { saved: false };
  }
}
