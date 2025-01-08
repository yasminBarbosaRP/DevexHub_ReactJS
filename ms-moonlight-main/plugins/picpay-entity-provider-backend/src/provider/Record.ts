import { userRefByEmail } from './utils';

export class EntityRef {
  public type?: 'user' | 'group';
  public namespace?: string;
  public name?: string;

  constructor(
    protected readonly args: {
      type: 'user' | 'group';
      namespace: string;
      name: string;
    } | null
  ) {
    this.type = args?.type;
    this.namespace = args?.namespace;
    this.name = args?.name;
  }

  public static fromEmail(email: string, type?: 'user' | 'group'): EntityRef {
    const leadInfo = userRefByEmail(email);
    if (!leadInfo) {
      return new EntityRef(null);
    }

    return new EntityRef({
      type: type || leadInfo.type,
      namespace: leadInfo.namespace,
      name: leadInfo.name,
    });
  }

  public equals(other?: EntityRef) {
    return (
      this.type === other?.type &&
      this.namespace === other?.namespace &&
      this.name === other?.name
    );
  }

  public isValid() {
    return this.type && this.namespace && this.name;
  }

  public toString() {
    return `${this.type}:${this.namespace}/${this.name}`;
  }
}

export interface PicPayGroup {
  email: string;
  name: string;
  parent_email: string;
  department: string;
}

export interface PicPayUser {
  email: string;
  name: string;
  job_name: string;
  lead_email: string;
  is_lead: boolean;
  active: boolean;
}
