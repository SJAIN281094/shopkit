import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from './base.entity';

@ObjectType()
@Entity('users')
export class User extends BaseModel {
  @Field()
  @Column()
  name: string;

  @Field()
  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Field()
  @Column({ default: true })
  isActive: boolean;
}
