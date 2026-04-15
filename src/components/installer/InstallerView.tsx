'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Observation, ObservationStatus, ObservationComment } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, PRIORITY_LABELS } from '@/lib/utils/status'
import { compressImage } from '@/lib/utils/image'
import {
  Building2, CheckCircle, AlertTriangle, MessageSquare, Send, Loader2,
  ChevronDown, ChevronUp, Map, List, X, User, Camera, ImageIcon,
  Sparkles, ArrowUpDown, Filter, Eye, Tag, FileDown, Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'