import type { ParamsObj } from './reducers';
import type { UntypedSchemaDef } from './schema';
import type { TypeBuilder } from './type_builders';
import type { ModuleExport } from './module_export';

/**
 * Type of a procedure as exported from a schema (procedure fn + module export).
 */
export type ProcedureExport<
  S extends UntypedSchemaDef,
  Params extends ParamsObj,
  Ret extends TypeBuilder<any, any>,
> = ((...args: any[]) => any) & ModuleExport;
