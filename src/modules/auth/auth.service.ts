import bcrypt from "bcrypt";

import { AppError, ErrorCode } from "@errors";
import { AuthRepository } from "./auth.repository";
import { LoginRequestDto } from "./auth.dtos";
import { SessionService } from "@modules/session";

export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly sessionService: SessionService,
    ) {}

    public async login(loginRequest: LoginRequestDto) {
        const { username, password, ipAddress, userAgent } = loginRequest;

        const staff = await this.authRepository.findStaffForLogin(username);

        if (!staff) {
            throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid username or password");
        }

        if (staff.deleted_at) {
            throw new AppError(404, ErrorCode.ACCOUNT_NOT_FOUND, "Account does not exist");
        }

        if (staff.is_disabled) {
            throw new AppError(401, ErrorCode.ACCOUNT_DISABLED, "Account has been disabled");
        }

        const isPasswordValid = await bcrypt.compare(password, staff.password_hash!);

        if (!isPasswordValid) {
            throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, "Invalid username or password");
        }

        const session = await this.sessionService.createSession(staff, ipAddress, userAgent);

        return {
            staff,
            session,
        };
    }

    public async logout(sessionId: string) {
        await this.sessionService.deleteSession(sessionId);
    }

    public async me(session: Express.Request["session"]) {
        return session;
    }
}
