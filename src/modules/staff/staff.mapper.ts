import { StaffDetailItemDto, StaffListItemDto } from "./staff.dto";
import { StaffDetailEntity, StaffListEntity } from "./staff.types";

export class StaffMapper {
    public static toListItem(
        staff: StaffListEntity,
    ): StaffListItemDto {
        return {
            staff_id: staff.staff_id,

            first_name: staff.first_name,
            last_name: staff.last_name,

            email: staff.email,
            mobile_number: staff.mobile_number,

            gender: staff.gender
                ? {
                    value_id: staff.gender.value_id,
                    value_name: staff.gender.value_name,
                }
                : null,

            is_disabled: staff.is_disabled,
            is_account_activated: staff.is_account_activated,

            last_login_at: staff.last_login_at
                ? staff.last_login_at.toISOString()
                : null,

            created_at: staff.created_at.toISOString(),

            roles: staff.staff_roles.map((staffRole) => ({
                role_id: staffRole.role.role_id,
                role_name: staffRole.role.role_name,
            })),
        };
    }

    public static toDetailItem(
        staff: StaffDetailEntity
    ): StaffDetailItemDto {
        return {
            staff_id: staff.staff_id,

            first_name: staff.first_name,
            last_name: staff.last_name,

            username: staff.username,

            email: staff.email,
            mobile_number: staff.mobile_number,

            gender: staff.gender ? {
                value_id: staff.gender.value_id,
                value_name: staff.gender.value_name,
            }
            : null,

            age: staff.age ?? null,
            street_address: staff.street_address ?? "",
            city: staff.city ?? "",
            state: staff.state ?? "",
            pincode: staff.pincode ?? "",
            
            roles: staff.staff_roles.map((staffRole) => ({
                role_id: staffRole.role.role_id,
                role_name: staffRole.role.role_name,
            })),

            is_disabled: staff.is_disabled,
            is_account_activated: staff.is_account_activated,
            last_login_at: staff.last_login_at?.toDateString() ?? null,
            created_at: staff.created_at.toDateString(),
        }
    }

    public static toList(
        staff: StaffListEntity[],
    ): StaffListItemDto[] {
        return staff.map((staff) => this.toListItem(staff));
    }
}