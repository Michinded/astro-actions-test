/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    token?: string;
    user?: {
      id: string;
      username: string;
    };
    // Wednesday middleware
    dayOfWeek?: number;
    isWednesday?: boolean;
  }
}
