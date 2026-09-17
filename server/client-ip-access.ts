import { BlockList, isIP } from "node:net";
import type { RequestHandler } from "express";

export interface ClientIpAllowlistOptions {
  allowedClientIps: string[];
  publicPaths?: string[];
}

export function createClientIpAllowlist(
  options: ClientIpAllowlistOptions,
): RequestHandler {
  const allowlist = new BlockList();
  const publicPaths = new Set(options.publicPaths);
  for (const entry of options.allowedClientIps) {
    const [address, prefix] = entry.split("/");
    const family = isIP(address) === 6 ? "ipv6" : "ipv4";
    if (prefix === undefined) {
      allowlist.addAddress(address, family);
    } else {
      allowlist.addSubnet(address, Number(prefix), family);
    }
  }

  return (request, response, next) => {
    if (options.allowedClientIps.length === 0) {
      next();
      return;
    }
    if (publicPaths.has(request.path)) {
      next();
      return;
    }
    const clientIp = request.get("cf-connecting-ip")?.trim();
    const family = clientIp && isIP(clientIp) === 6 ? "ipv6" : "ipv4";
    if (!clientIp || isIP(clientIp) === 0 || !allowlist.check(clientIp, family)) {
      response.status(403).json({ error: "Client IP is not allowed." });
      return;
    }
    next();
  };
}
