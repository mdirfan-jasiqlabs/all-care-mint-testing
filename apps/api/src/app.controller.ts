import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/v1/health')
  async getHealth(@Res() res: any) {
    try {
      // Execute a lightweight query to verify db connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).send({
        status: 'UP',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        status: 'DOWN',
        database: 'DISCONNECTED',
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
