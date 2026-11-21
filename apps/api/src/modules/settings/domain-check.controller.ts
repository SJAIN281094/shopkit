import { Controller, Get, HttpCode, NotFoundException, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';

/**
 * For the edge proxy's on-demand TLS (e.g. Caddy `on_demand_tls { ask … }`):
 * 200 when we serve the domain, 404 otherwise, so certificates are only issued for real stores.
 */
@Controller('domains')
export class DomainCheckController {
  constructor(private readonly settings: SettingsService) {}

  @Get('check')
  @HttpCode(200)
  async check(@Query('domain') domain?: string): Promise<{ ok: true }> {
    if (!domain || !(await this.settings.isServedHost(domain))) throw new NotFoundException();
    return { ok: true };
  }
}
