
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeAdminApp } from '@/lib/firebase-admin-init';
import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Helper function to read secrets
const readSecret = (secretName: string): string | undefined => {
  try