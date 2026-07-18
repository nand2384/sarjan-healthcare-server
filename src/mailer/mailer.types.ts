export interface SendMailOptions {
    to: string;
    subject: string;
    html: string;
}

export interface SendStaffActivationMailOptions {
    to: string;
    firstName: string;
    username: string;
    activationLink: string;
}