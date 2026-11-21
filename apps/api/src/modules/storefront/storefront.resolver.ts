import { Args, Query, Resolver } from '@nestjs/graphql';
import { StorefrontService } from './storefront.service';
import { StorefrontPayload } from './storefront.types';

@Resolver()
export class StorefrontResolver {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Query(() => StorefrontPayload, {
    nullable: true,
    description: 'Public store data for the storefront app, looked up by request host',
  })
  storefront(
    @Args('host') host: string,
    @Args('previewToken', { type: () => String, nullable: true }) previewToken?: string | null,
  ): Promise<StorefrontPayload | null> {
    return this.storefrontService.resolve(host, previewToken);
  }
}
