# Source Adapters

## Adding a New Adapter

1. Create a new file in `src/api/adapters/` implementing the `SourceAdapter`
   interface from `src/api/sourceAdapter.ts`.
2. Export a class with a `descriptor` property (type `SourceAdapterDescriptor`)
   that declares the adapter's ID, display name, supported content types,
   jurisdictions, access tier, licence, rate-limit hint, and key requirements.
3. Implement `search()`, `resolve()`, `getMetadata()`, and `healthcheck()`.
4. Register the adapter in `src/api/sourceRegistry.ts` so it appears in
   Settings > Source Registry.
5. Add tests in `tests/api/`.

## Architectural Boundary

Commercial adapters consume the stable `SourceAdapter` interface but must not
import engine internals (anything under `src/engine/`). The interface is the
only coupling point between the open-source core and commercial integrations.

Adapter code communicates with the rest of Obiter exclusively through:

- `SourceAdapter` (the contract)
- `keyVault` (API key storage)
- `devicePreferences` (user-level toggles)

## Licence Note

The Obiter core is licensed under GPLv3. Commercial adapter code that only
consumes the stable `SourceAdapter` interface may carry its own licence,
provided it does not import or link against GPLv3 internals beyond the
interface boundary. This follows the principle that interface-only consumption
does not create a derivative work.
