import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from "@nestjs/common";

import * as argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import { UserRole, StudentApprovalStatus } from "@prisma/client";
import { generateRefreshToken, hashRefreshToken } from "./utils/refresh-token.util";
import { DatabaseService } from "../../database/database.service";
import { removeFields } from "../../common/utils/object.util";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { LoginRequestDto } from "./dto/login.dto";
import { verifyRefreshToken } from "./utils/crypto.util";
import { StudentRegisterDto } from "./dto/register.dto";
import { LogoutDto } from "./dto/logout.dto";


@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly jwt: JwtService,
    ) { }



    async registerStudent(dto: StudentRegisterDto) {

        // *TODO - 
        //! move this to student module cuz it only relates to his CRUD , not related other useres
        //* >>  const student = await this.studentService.create(dto , UserRole.STUDENT)
        //! + create it as Prisma Transaction
        //! + implement Notification system
        
        // const exists = await this.prisma.user.findUnique({
        //     where: { email: dto.email },
        // });

        // if (exists) {
        //     throw new BadRequestException("Email already exists");
        // }

        // const hashed = await argon2.hash(dto.password);

        // const user = await this.prisma.user.create({
        //     data: {
        //         email: dto.email,
        //         password: hashed,
        //         firstName: dto.firstName,
        //         lastName: dto.lastName,
        //         phone: dto.phone,
        //         role: UserRole.STUDENT,
        //         universityId: dto.universityId,
        //     },
        // });

        // await this.prisma.studentProfile.create({
        //     data: {
        //         userId: user.id,
        //         universityId: dto.universityId,
        //         studentNumber: dto.studentNumber,
        //         verificationDocument: dto.verificationDocument,
        //         approvalStatus: StudentApprovalStatus.PENDING,
        //     },
        // });

        // return this.issueTokens(user.id);



    }






    async login(dto: LoginRequestDto) {

        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { studentProfile: true },
        });

        if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }

        // const valid = await argon2.verify(user.password, dto.password);

        const valid = await verifyRefreshToken(user.password, dto.password)

        if (!valid) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (!user.isActive) {
            throw new UnauthorizedException("Account disabled");
        }

        // *TODO -  should enhance this to allow it view only it's own profile when approvalStatus == pending
        if (user.role === UserRole.STUDENT) {
            if (
                !user.studentProfile ||
                user.studentProfile.approvalStatus !== StudentApprovalStatus.APPROVED
            ) {
                throw new UnauthorizedException("Account not approved yet");
            }
        }

        const {accessToken , refreshToken} = await this.issueTokens(user.id);
        const userWithoutPassword = removeFields(user , [
            'password' ,
        ])

        // return {
        //     ...tokens,
        //     user: {
        //         id: user.id,
        //         email: user.email,
        //         role: user.role,
        //         status: user.studentProfile?.approvalStatus ?? true,
        //     },
        // };

        return {
            user : userWithoutPassword,
            accessToken ,
            refreshToken,
        }
    }

    


    async logout(dto : LogoutDto) {
        
        const providedHash = hashRefreshToken(dto.refreshToken);
        await this.prisma.refreshToken.updateMany({
            where: { 
                token: providedHash, 
                revokedAt: null 
            },
            data: { 
                revokedAt: new Date() 
            },
        });
        return { 
            success: true ,
            message: "Logged out successfully"
        }
    }



    // async logout(userId: number) {
    //     await this.prisma.refreshToken.deleteMany({
    //         where: { userId },
    //     });

    //     return { message: "Logged out successfully" };
    // }



   // *TODO -  Implement Forget Password logic + NodeMailer for only once used email
    
    
    async refresh(dto: RefreshTokenDto) {
        
        const hashedToken = hashRefreshToken(dto.refreshToken);

        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: hashedToken },
            select: {
                id: true,
                userId: true,
                expiresAt: true,
                revokedAt: true,
            
            },
        });

        if (!stored || stored.revokedAt) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        if (stored.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException("Refresh token expired");
        }

        await this.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
        });

        const user = await this.prisma.user.findUnique({
            where: { id: stored.userId },
            select: {
                id: true,
                role: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException("User not found or inactive");
        }

        // return this.issueTokens(user.id, user.role);
        return this.issueTokens(stored.userId);
    }




    async issueTokens(userId : number ) {

        const user = await this.prisma.user.findUnique ({
            where : {id : userId} , 
            include: { studentProfile: true },
        })

        if (!user) throw new UnauthorizedException('Invalid session , wait for approval!');

        const payload = { 
            sub: userId, 
            role : user.role 
            }

        
        const accessToken = generateRefreshToken()
       
        const refreshToken = this.jwt.sign(payload, {
            expiresIn: "30d",
        });

        const refreshHash = hashRefreshToken(refreshToken)
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshHash,
                expiresAt,
            }
        });

        return {
            accessToken,
            refreshToken,
        }





    }
    

    // issueTokens(userId: number, role: UserRole) {
    //     const payload = { sub: userId, role };

    //     const accessToken = this.jwt.sign(payload, {
    //         expiresIn: "15m",
    //     });

    //     const refreshToken = this.jwt.sign(payload, {
    //         secret: process.env.JWT_REFRESH_SECRET,
    //         expiresIn: "7d",
    //     });

        
    //     this.storeRefreshToken(userId, refreshToken);

    //     return {
    //         accessToken,
    //         refreshToken,
    //     };
    // }

    
    
    // private async storeRefreshToken(userId: number, token: string) {
    //     const hashed = hashRefreshToken(token);

    //     await this.prisma.refreshToken.create({
    //         data: {
    //             userId,
    //             token: hashed,
    //             expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    //         },
    //     });
    // }
}