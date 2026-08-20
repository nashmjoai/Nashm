import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Button,
  Input,
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  SecretInput,
} from '@nashm/client';
import type { IntegrationPreset } from './integrationPresets';
import { useLocalize } from '~/hooks';

interface CredentialsDialogProps {
  preset: IntegrationPreset | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string>) => void;
}

export default function CredentialsDialog({
  preset,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: CredentialsDialogProps) {
  const localize = useLocalize();
  const [values, setValues] = useState<Record<string, string>>({});
  const fields = preset?.credentials?.fields;

  useEffect(() => {
    setValues(Object.fromEntries((fields ?? []).map((field) => [field.id, ''])));
  }, [preset, fields]);

  const submit = () => {
    if ((fields ?? []).some((field) => !values[field.id]?.trim())) {
      return;
    }
    onSubmit(values);
  };

  return (
    <OGDialog open={preset != null} onOpenChange={onOpenChange}>
      <OGDialogContent title={preset?.name ?? ''} className="w-11/12 max-w-md">
        <OGDialogHeader>
          <OGDialogTitle>
            {localize('com_ui_mcp_connect_credentials', { 0: preset?.name ?? '' })}
          </OGDialogTitle>
        </OGDialogHeader>
        <div className="space-y-4">
          {(fields ?? []).map((field, index) => {
            const sharedProps = {
              id: field.id,
              value: values[field.id] ?? '',
              autoFocus: index === 0,
              autoComplete: 'off',
              onChange: (event: ChangeEvent<HTMLInputElement>) =>
                setValues((current) => ({ ...current, [field.id]: event.target.value })),
            };

            return (
              <div key={field.id} className="space-y-1.5">
                <label htmlFor={field.id} className="text-sm font-medium text-text-primary">
                  {localize(field.labelKey)}
                </label>
                {field.sensitive === false ? (
                  <Input {...sharedProps} type="text" />
                ) : (
                  <SecretInput {...sharedProps} autoComplete="new-password" controlsOnHover />
                )}
                {field.descriptionKey && (
                  <p className="text-xs text-text-secondary">{localize(field.descriptionKey)}</p>
                )}
              </div>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {localize('com_ui_cancel')}
            </Button>
            <Button onClick={submit} disabled={isSubmitting}>
              {isSubmitting ? localize('com_ui_connecting') : localize('com_ui_connect')}
            </Button>
          </div>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
