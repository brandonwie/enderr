import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * User decorator to extract authenticated user from request
 * @remarks Use this decorator to get the current user in controllers
 * @example
 * ```typescript
 * @Get()
 * getProfile(@User() user: UserFromJwt) {
 *   return user;
 * }
 * ```
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
