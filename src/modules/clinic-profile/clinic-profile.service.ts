import { AppError, ErrorCode } from "@errors";
import { ClinicProfileRepository, UpdateClinicProfileData } from "./clinic-profile.repository";

export class ClinicProfileService {
    constructor(private readonly clinicProfileRepository: ClinicProfileRepository) {}

    public async get() {
        const profile = await this.clinicProfileRepository.find();
        if (!profile) {
            throw new AppError(404, ErrorCode.NOT_FOUND, "Clinic profile hasn't been set up yet.");
        }
        return profile;
    }

    public async update(data: UpdateClinicProfileData) {
        await this.get();
        return this.clinicProfileRepository.update(data);
    }

    /** Public-shaped read — reshapes to the client's existing ClinicDetails convention (camelCase, daysOpen). */
    public async getPublic() {
        const profile = await this.get();
        return {
            address: profile.address,
            phone: profile.phone,
            email: profile.email,
            timings: profile.timings,
            daysOpen: profile.days_open,
            aboutDescription: profile.about_description,
        };
    }
}
