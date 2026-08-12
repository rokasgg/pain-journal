import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import { useLocaleStore } from '@/store/useLocaleStore';
import type { MuscleFindingInsert, PhysioAssessment, PhysioAssessmentInsert } from '@/types/database.types';

export function usePhysioAssessments() {
  const { user } = useSession();

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['physioAssessments', user?.id],
    queryFn: async (): Promise<PhysioAssessment[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('physio_assessments')
        .select('*, muscle_findings(*)')
        .eq('user_id', user.id)
        .order('visit_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PhysioAssessment[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { assessments: assessments ?? [], isLoading };
}

// Best-effort: regenerate the Home widget's AI "current focus" sentence.
// Visits are infrequent, so it's safe to auto-run on every create/edit/delete
// without a manual regenerate button; failures here shouldn't surface to the
// user since the triggering action (save/delete) already succeeded.
async function refreshPhysioFocus(queryClient: ReturnType<typeof useQueryClient>, userId: string | undefined) {
  try {
    const locale = useLocaleStore.getState().locale;
    await supabase.functions.invoke('physio-focus', { body: { locale } });
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  } catch {
    // Silently ignore — the widget just won't refresh until next time.
  }
}

export function useCreatePhysioAssessment() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      assessment: Omit<PhysioAssessmentInsert, 'user_id'>;
      findings: MuscleFindingInsert[];
    }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { data: assessment, error: assessmentError } = await supabase
        .from('physio_assessments')
        .insert({ ...input.assessment, user_id: user.id })
        .select()
        .single();

      if (assessmentError || !assessment) {
        return { error: assessmentError?.message ?? t('common.notSignedIn') };
      }

      const { error: findingsError } = await supabase
        .from('muscle_findings')
        .insert(input.findings.map((finding) => ({ ...finding, assessment_id: assessment.id })));

      return { error: findingsError?.message ?? null };
    },
    onSuccess: async (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['physioAssessments', user?.id] });
      await refreshPhysioFocus(queryClient, user?.id);
    },
  });
}

export function useUpdatePhysioAssessment() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      assessment: Omit<PhysioAssessmentInsert, 'user_id'>;
      findings: MuscleFindingInsert[];
    }): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error: assessmentError } = await supabase
        .from('physio_assessments')
        .update(input.assessment)
        .eq('id', input.id)
        .eq('user_id', user.id);

      if (assessmentError) return { error: assessmentError.message };

      // Simplest correct way to reconcile the findings list without a
      // transaction/RPC: drop the old rows for this assessment and reinsert
      // the current form state as new rows.
      const { error: deleteError } = await supabase.from('muscle_findings').delete().eq('assessment_id', input.id);
      if (deleteError) return { error: deleteError.message };

      const { error: insertError } = await supabase
        .from('muscle_findings')
        .insert(input.findings.map((finding) => ({ ...finding, assessment_id: input.id })));

      return { error: insertError?.message ?? null };
    },
    onSuccess: async (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['physioAssessments', user?.id] });
      await refreshPhysioFocus(queryClient, user?.id);
    },
  });
}

export function useDeletePhysioAssessment() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      // muscle_findings cascade-delete via the assessment_id FK.
      const { error } = await supabase.from('physio_assessments').delete().eq('id', id).eq('user_id', user.id);

      return { error: error?.message ?? null };
    },
    onSuccess: async (result) => {
      if (result.error) return;
      queryClient.invalidateQueries({ queryKey: ['physioAssessments', user?.id] });
      await refreshPhysioFocus(queryClient, user?.id);
    },
  });
}
