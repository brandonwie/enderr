import { Global, Module } from '@nestjs/common';
import { CustomLogger } from './logger.service';

/**
 * Global logger module
 * @remarks Makes the custom logger available throughout the application
 */
@Global()
@Module({
  providers: [CustomLogger],
  exports: [CustomLogger],
})
export class LoggerModule {}
