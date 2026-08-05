import { Controller, Post, Body, UsePipes, ValidationPipe, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ProviderLeadService } from '../services/provider-lead.service';
import { SubmitProviderLeadDto } from '../dto/provider.dto';

const ipSubmissionTracker = new Map<string, number[]>();

@Controller()
export class PublicProviderLeadController {
  constructor(private readonly providerLeadService: ProviderLeadService) {}

  private checkRateLimit(ip: string) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const history = (ipSubmissionTracker.get(ip) || []).filter((t) => t > oneHourAgo);
    
    if (history.length >= 5) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'ERR_RATE_LIMIT_EXCEEDED',
            message: 'Too many provider lead submissions from this IP. Maximum 5 submissions allowed per hour.',
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    
    history.push(now);
    ipSubmissionTracker.set(ip, history);
  }

  @Post(['api/v1/public/provider-leads', 'api/v1/provider-leads'])
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async submitLead(@Body() dto: SubmitProviderLeadDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    this.checkRateLimit(String(ip));

    const result = await this.providerLeadService.submitLead(dto);
    return {
      success: true,
      message: "Thank you! We'll be in touch soon.",
      data: result,
    };
  }
}

