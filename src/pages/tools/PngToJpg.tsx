import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertImage } from '@/tools/imageConverter';
import type { FileWithPreview } from '@/types';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const PngToJpg: React.FC = () => {
  const { t } = useTranslation();
  const [quality, setQuality] = useState(92);

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      options.setProgress((i / files.length) * 50);
      
      const blob = await convertImage(file.file, { 
        format: 'jpeg', 
        quality: quality / 100 
      });
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
          step={1}
        />
      </div>
    </div>
  );

  return (
    <ToolLayout
      toolId="png-to-jpg"
      title={t('tools.pngToJpg.title')}
      description={t('tools.pngToJpg.description')}
      seoTitle={t('tools.pngToJpg.seoTitle')}
      seoDescription={t('tools.pngToJpg.seoDescription')}
      accept="image/png"
      multiple={true}
      maxFiles={10}
      renderOptions={renderOptions}
      onConvert={handleConvert}
      outputFormat="jpg"
      keywords={['png to jpg', 'convert png to jpeg', 'image converter', 'free online']}
    />
  );
};

export default PngToJpg;
