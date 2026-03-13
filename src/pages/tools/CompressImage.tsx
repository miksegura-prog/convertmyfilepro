import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { compressImage } from '@/tools/imageConverter';
import type { FileWithPreview } from '@/types';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const CompressImage: React.FC = () => {
  const { t } = useTranslation();
  const [quality, setQuality] = useState(80);

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      options.setProgress((i / files.length) * 50);
      
      const blob = await compressImage(file.file, quality / 100);
      file.result = blob;
      file.resultUrl = URL.createObjectURL(blob);
      
      options.setProgress(((i + 1) / files.length) * 100);
    }
  };

  const renderOptions = (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between mb-2">
          <Label>{t('tools.compressImage.quality')}</Label>
          <span className="text-sm text-[var(--color-muted)]">{quality}%</span>
        </div>
        <Slider
          value={[quality]}
          onValueChange={(v) => setQuality(v[0])}
          min={10}
          max={100}
          step={5}
        />
        <p className="text-xs text-[var(--color-muted)] mt-2">
          Higher quality = larger file size
        </p>
      </div>
    </div>
  );

  return (
    <ToolLayout
      toolId="compress-image"
      title={t('tools.compressImage.title')}
      description={t('tools.compressImage.description')}
      seoTitle={t('tools.compressImage.seoTitle')}
      seoDescription={t('tools.compressImage.seoDescription')}
      accept="image/*"
      multiple={true}
      maxFiles={10}
      renderOptions={renderOptions}
      onConvert={handleConvert}
      keywords={['compress image', 'image compressor', 'reduce image size', 'optimize images']}
    />
  );
};

export default CompressImage;
