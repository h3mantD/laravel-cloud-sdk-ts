import { describe, expectTypeOf, it } from 'vitest';

import type { paths } from '../src/generated/openapi';
import type { OpenApiPaths } from '../src/types/overrides';

describe('generated OpenAPI types', () => {
  it('exposes stable Laravel Cloud paths for SDK typing', () => {
    expectTypeOf<OpenApiPaths>().toEqualTypeOf<paths>();
    expectTypeOf<paths>().toHaveProperty('/applications');
    expectTypeOf<paths>().toHaveProperty('/environments/{environment}/deployments');
  });
});
