import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from './base.entity';

export enum AiFeature {
  STORE_GENERATION = 'STORE_GENERATION',
  PRODUCT_LISTING = 'PRODUCT_LISTING',
}

@Entity('ai_usage')
@Index(['shopId', 'createdAt'])
export class AiUsage extends BaseModel {
  @Column('uuid')
  shopId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: AiFeature })
  feature: AiFeature;

  @Column()
  provider: string;

  @Column()
  model: string;

  @Column({ type: 'int' })
  creditsCharged: number;

  @Column({ type: 'int', default: 0 })
  inputTokens: number;

  @Column({ type: 'int', default: 0 })
  outputTokens: number;

  @Column({ default: true })
  succeeded: boolean;
}
