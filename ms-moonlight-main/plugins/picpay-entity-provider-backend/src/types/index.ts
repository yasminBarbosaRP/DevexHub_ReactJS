import { AdditionalInformation, Members } from "../database/tables";


export type FullAdditionalInformation = AdditionalInformation & {
    members: Members[];
}