/**
 * Stand-in for @base-org/account. wagmi's Base Account connector imports it lazily, and its payment code
 * pulls in @coinbase/cdp-sdk → optional @x402/* packages that aren't installed, which breaks the build.
 * We never offer that connector (Base Account doesn't support Arkiv's chain), so it resolves here instead.
 */
export function createBaseAccountSDK(): never {
  throw new Error("Base Account is not supported on Arkiv")
}
