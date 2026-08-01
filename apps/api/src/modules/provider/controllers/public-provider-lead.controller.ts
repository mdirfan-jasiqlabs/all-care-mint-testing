import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProviderLeadService } from '../services/provider-lead.service';
import { SubmitProviderLeadDto } from '../dto/provider.dto';

@Controller('api/v1/provider-leads')
export class PublicProviderLeadController {
  constructor(private readonly providerLeadService: ProviderLeadService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitLead(@Body() dto: SubmitProviderLeadDto) {
    const result = await this.providerLeadService.submitLead(dto);
    return {
      success: true,
      message: 'Provider application lead submitted successfully.',
      data: result,
    };
  }
}
