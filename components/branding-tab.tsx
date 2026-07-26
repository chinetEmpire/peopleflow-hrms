'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { getSupabase } from '@/lib/supabase';
import { updateOrganization } from '@/lib/organizations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Palette, Upload, Building2, Loader2, Trash2, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#032364', '#0e3a94', '#3b82f6', '#06b6d4',
  '#10b981', '#059669', '#8b5cf6', '#7c3aed',
  '#ec4899', '#ef4444', '#f59e0b', '#6366f1',
  '#14b8a6', '#f97316', '#84cc16', '#64748b',
];

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

export function BrandingTab() {
  const { profile, refreshProfile } = useAuth();
  const { organization, refreshOrganization } = useTenant();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [primaryColor, setPrimaryColor] = useState(organization?.primary_color || '#032364');
  const [logoPreview, setLogoPreview] = useState<string | null>(organization?.logo_url || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHr = profile?.role === 'hr_admin' || profile?.role === 'super_admin';

  if (!isHr || !organization) return null;

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Logo must be under 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadLogo(): Promise<string | null> {
    if (!logoFile || !organization) return logoPreview;

    const fileExt = logoFile.name.split('.').pop() || 'png';
    const filePath = `logos/${organization.id}/logo.${fileExt}`;

    const { error } = await getSupabase().storage
      .from('org-logos')
      .upload(filePath, logoFile, { upsert: true });

    if (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
      return null;
    }

    const { data: urlData } = getSupabase().storage
      .from('org-logos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  async function handleSave() {
    if (!orgName.trim() || !organization) {
      toast.error('Organization name is required');
      return;
    }

    setSaving(true);
    try {
      let logoUrl = organization.logo_url;

      if (logoFile) {
        const uploaded = await uploadLogo();
        if (uploaded) logoUrl = uploaded;
      }

      await updateOrganization(organization.id, {
        name: orgName.trim(),
        primary_color: primaryColor,
        logo_url: logoUrl,
      });

      await refreshOrganization();
      toast.success('Branding updated successfully');
      setLogoFile(null);
    } catch {
      toast.error('Failed to update branding');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveLogo() {
    if (!organization) return;
    setLogoPreview(null);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      await updateOrganization(organization.id, { logo_url: null });
      await refreshOrganization();
      toast.success('Logo removed');
    } catch {
      toast.error('Failed to remove logo');
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
              <Building2 className="h-5 w-5 text-[#032364]" />
            </div>
            <CardTitle className="text-sm font-semibold text-[#051536]">Organization Logo</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-2xl overflow-hidden border-2 border-dashed"
                style={{ borderColor: primaryColor + '40' }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Building2 className="mx-auto h-8 w-8" style={{ color: primaryColor + '60' }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-border shadow-sm hover:bg-muted transition-colors"
              >
                <Upload className="h-4 w-4" style={{ color: primaryColor }} />
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#051536]">Upload organization logo</p>
              <p className="text-xs text-muted-foreground">PNG, JPG or SVG. Max 2MB. Recommended: 256x256px</p>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Choose file
                </Button>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="rounded-lg text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Name */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
              <Building2 className="h-5 w-5 text-[#032364]" />
            </div>
            <CardTitle className="text-sm font-semibold text-[#051536]">Organization Name</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization name"
              className="rounded-lg border-[#0000004c]"
            />
            <p className="text-xs text-muted-foreground">
              This is displayed across the platform and on the login page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Primary Color */}
      <Card className="rounded-xl border-0 bg-white vcgl-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#032364]/10">
              <Palette className="h-5 w-5 text-[#032364]" />
            </div>
            <CardTitle className="text-sm font-semibold text-[#051536]">Primary Color</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-12 cursor-pointer rounded-lg border-2 border-border"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={primaryColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-f]{6}$/i.test(v)) setPrimaryColor(v);
                  }}
                  placeholder="#032364"
                  className="max-w-[140px] rounded-lg border-[#0000004c] font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Quick pick</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPrimaryColor(color)}
                    className="relative h-8 w-8 rounded-lg transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  >
                    {primaryColor === color && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-3">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white text-sm font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  A
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: primaryColor }}>
                    {orgName || 'Organization'}
                  </p>
                  <p className="text-xs text-muted-foreground">hr.yourcompany.com</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Primary Button
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-4 py-2 text-sm font-medium"
                  style={{ color: primaryColor, borderColor: primaryColor + '40' }}
                >
                  Outline Button
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-[#032364] hover:bg-[#032364]/90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Branding'
          )}
        </Button>
      </div>
    </div>
  );
}
