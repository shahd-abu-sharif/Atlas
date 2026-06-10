import { Body, Controller, Post, UseGuards, Headers, BadRequestException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {  studentRegisterSchema,type studentRegisterSchemaDto} from "./validation/student.register.validation.schema";
import { loginSchema, type LoginSchemaDto } from "./validation/login.validation.schema";
import { logoutSchema, type LogoutSchemaDto } from "./validation/logout.validation.schema";
import { ZodValidationPipe } from "../../common/pipes/zod.pipe";
import { refreshTokenSchema, type RefreshTokenSchemaDto } from "./validation/refresh.validation.schema";
import { type authedUserType } from "../../common/types/unifiedType.types";
import { AuthedUser } from "../../common/decorators/authedUser.decorator";
import { LoginRequestDto, LoginResponseDto } from "./dto/login.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { LogoutResponseDto } from "./dto/logout.dto";
import { IsPublic } from '../../common/decorators/isPublic.decorator'
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { HttpCode, HttpStatus } from "@nestjs/common";

// import { AuthedUser } from "../../common/decorators/authed-user.decorator";
// import { authedUserType } from "../../common/types/authed-user.type";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    constructor(private authService: AuthService) { }

    //! auth/register/student

    @IsPublic()
    @Post("register/student")
    @ApiOperation({ summary: "Student registration" })
    @ApiResponse({ status: 201 })
    register(
        @Body(new ZodValidationPipe(studentRegisterSchema))
        dto: studentRegisterSchemaDto,
    ) {
        return this.authService.registerStudent(dto);
    }


    //! auth/login 

    @IsPublic()
    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Login" })
    @ApiBody({ type: LoginRequestDto })
    @ApiResponse({ status: 200 , type : LoginResponseDto })
    login(
        @Body(new ZodValidationPipe(loginSchema))
        dto: LoginSchemaDto,
    ) {
        return this.authService.login(dto);
    }

    //! auth/refresh 

    // @IsPublic()
    @Post("refresh")
    @ApiOperation({ summary: "Refresh tokens" })
    @ApiBody({ type: RefreshTokenDto })
    @ApiResponse({ status: 200 })
    refresh(
        @Body(new ZodValidationPipe(refreshTokenSchema))
        dto: RefreshTokenSchemaDto,
    ) {
        return this.authService.refresh(dto);
    }

    //! auth/logout 


    @UseGuards(JwtAuthGuard)
    @Post("logout")
    @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
    @ApiResponse({ status: 200, type: LogoutResponseDto })
    logout(
        @AuthedUser() user: authedUserType,
        @Body(new ZodValidationPipe(logoutSchema))
       
        dto: LogoutSchemaDto,
    ) {
        // return this.authService.logout(user.id);
        return this.authService.logout(dto);
    }



    // @UseGuards(JwtAuthGuard)
    // @Post("logout")
    // @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
    // @ApiResponse({ status: 200, type: LogoutResponseDto })
    // logout(
    //     @AuthedUser() user: authedUserType,
    //     @Body() body: unknown,
    //     @Headers('x-refresh-token') refreshHeader?: string,
    // ) {
    //     const tokenFromBody = (body as any)?.refreshToken;
    //     const refreshToken = tokenFromBody ?? refreshHeader;

    //     if (!refreshToken) {
    //         throw new BadRequestException({
    //             message: 'Validation failed',
    //             errors: {
    //                 formErrors: ['refreshToken is required in body or x-refresh-token header'],
    //                 fieldErrors: {},
    //             },
    //         });
    //     }

    //     const parsed = logoutSchema.safeParse({ refreshToken });
    //     if (!parsed.success) {
    //         throw new BadRequestException({ message: 'Validation failed', errors: parsed.error.flatten() });
    //     }

    //     return this.authService.logout({ refreshToken });
    // }

}
