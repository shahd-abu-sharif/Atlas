import z, { ZodType } from "zod";
import {
    emailSchema,
    nameSchema,
    passwordSchema,
    phoneSchema,
} from "../../../common/utils/zod.helper";
import { StudentRegisterDto } from "../dto/register.dto";

export const studentRegisterSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    universityId: z.number().int(),
    studentNumber: z.number().int(),
    verificationDocument: z.string().min(1),
    personalID: z
        .number()
        .int()
        .gte(1000000000)
        .lte(9999999999),
})
.strict() satisfies ZodType<StudentRegisterDto>

export type studentRegisterSchemaDto = z.infer<typeof studentRegisterSchema>;