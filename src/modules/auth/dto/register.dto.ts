import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        example: 'test@mail.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'StrongPassword123',
    })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
        message: 'Password must contain uppercase, lowercase and number',
    })
    password: string;
}