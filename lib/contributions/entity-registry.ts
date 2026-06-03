import { compositeId } from '../utils.ts';
import { slugify } from './contribution-pure.ts';

export interface FieldDescriptor {
  key: string;
  label: string;
  type: 'text' | 'longtext' | 'number' | 'boolean' | 'enum' | 'latlng';
  enumValues?: readonly string[];
  min?: number;
  max?: number;
  required?: boolean;
}

export interface EntityConfig {
  entityType: string;  // 'access-point' | 'rapid' | 'shuttle-business' | 'outfitter'
  tableName: string;   // 'AccessPoint' | 'Rapid' | 'ShuttleBusiness' | 'Outfitter'
  label: string;
  fields: FieldDescriptor[];
  newId(input: Record<string, any>): string;
}

const ACCESS_POINT_KIND_VALUES = [
  'put-in', 'take-out', 'both', 'trailer_ramp', 'slide_rails',
  'carry_in', 'carry_out', 'horse_pack_in', 'fly_in', 'other',
] as const;

export const ENTITY_REGISTRY: Record<string, EntityConfig> = {
  'access-point': {
    entityType: 'access-point',
    tableName: 'AccessPoint',
    label: 'Access point',
    fields: [
      { key: 'name',          label: 'Name',            type: 'text',    required: true },
      { key: 'kind',          label: 'Kind',            type: 'enum',    enumValues: ACCESS_POINT_KIND_VALUES },
      { key: 'directions',    label: 'Directions',      type: 'longtext' },
      { key: 'permitRequired',label: 'Permit required', type: 'boolean' },
      { key: 'feeUsd',        label: 'Fee (USD)',        type: 'number',  min: 0 },
      { key: 'parkingSpaces', label: 'Parking spaces',  type: 'number',  min: 0 },
      { key: 'latitude',      label: 'Latitude',        type: 'latlng',  min: -90,  max: 90 },
      { key: 'longitude',     label: 'Longitude',       type: 'latlng',  min: -180, max: 180 },
      { key: 'riverMile',     label: 'River mile',      type: 'number',  min: 0 },
      { key: 'notes',         label: 'Notes',           type: 'longtext' },
      { key: 'altNames',      label: 'Alt names',       type: 'text' },
    ],
    newId(input: Record<string, any>): string {
      return compositeId(['ap', slugify(input.name ?? 'unnamed'), String(Date.now())]);
    },
  },
  'rapid': {
    entityType: 'rapid',
    tableName: 'Rapid',
    label: 'Rapid',
    fields: [
      { key: 'name',               label: 'Name',                type: 'text',     required: true },
      { key: 'classRating',        label: 'Class rating',        type: 'text' },
      { key: 'riverMile',          label: 'River mile',          type: 'number',   min: 0 },
      { key: 'latitude',           label: 'Latitude',            type: 'latlng',   min: -90,  max: 90 },
      { key: 'longitude',          label: 'Longitude',           type: 'latlng',   min: -180, max: 180 },
      { key: 'scoutPortageNotes',  label: 'Scout / portage notes', type: 'longtext' },
      { key: 'linesJson',          label: 'Lines (JSON)',         type: 'longtext' },
      { key: 'hazardsJson',        label: 'Hazards (JSON)',       type: 'longtext' },
      { key: 'classByFlowJson',    label: 'Class by flow (JSON)', type: 'longtext' },
    ],
    newId(input: Record<string, any>): string {
      return compositeId(['rapid', slugify(input.name ?? 'unnamed'), String(Date.now())]);
    },
  },
  'shuttle-business': {
    entityType: 'shuttle-business',
    tableName: 'ShuttleBusiness',
    label: 'Shuttle business',
    fields: [
      { key: 'name',               label: 'Name',                     type: 'text',     required: true },
      { key: 'phone',              label: 'Phone',                    type: 'text' },
      { key: 'website',            label: 'Website',                  type: 'text' },
      { key: 'serviceCorridorIds', label: 'Service corridors (JSON)', type: 'longtext' },
      { key: 'ratesJson',          label: 'Rates (JSON)',             type: 'longtext' },
      { key: 'notes',              label: 'Notes',                    type: 'longtext' },
    ],
    newId(input: Record<string, any>): string {
      return compositeId(['shuttle', slugify(input.name ?? 'unnamed'), String(Date.now())]);
    },
  },
  'outfitter': {
    entityType: 'outfitter',
    tableName: 'Outfitter',
    label: 'Outfitter',
    fields: [
      { key: 'name',               label: 'Name',                     type: 'text',     required: true },
      { key: 'licenseNumber',      label: 'License number',           type: 'text' },
      { key: 'licenseState',       label: 'License state',            type: 'text' },
      { key: 'phone',              label: 'Phone',                    type: 'text' },
      { key: 'website',            label: 'Website',                  type: 'text' },
      { key: 'serviceCorridorIds', label: 'Service corridors (JSON)', type: 'longtext' },
      { key: 'tripTypesJson',      label: 'Trip types (JSON)',        type: 'longtext' },
      { key: 'notes',              label: 'Notes',                    type: 'longtext' },
    ],
    newId(input: Record<string, any>): string {
      return compositeId(['outfitter', slugify(input.name ?? 'unnamed'), String(Date.now())]);
    },
  },
};

export function getEntityConfig(entityType: string): EntityConfig | null {
  return ENTITY_REGISTRY[entityType] ?? null;
}
