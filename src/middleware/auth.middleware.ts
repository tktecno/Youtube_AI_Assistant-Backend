import type { NextFunction, Request, Response } from "express";

import { supabase } from "../lib/supabase.js";
import { AppError } from "./error.middleware.js";

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
};

export const requireAuth = async (
  request: Request,
  _response: Response,
  next: NextFunction
): Promise<void> => {
  const accessToken = extractBearerToken(request.headers.authorization);

  if (!accessToken) {
    next(new AppError("Authentication required.", 401));
    return;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    next(new AppError("Invalid or expired session.", 401));
    return;
  }

  request.user = {
    id: data.user.id,
    email: data.user.email ?? null
  };

  next();
};
