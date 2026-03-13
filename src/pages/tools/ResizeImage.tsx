import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { resizeImage } from '@/tools/imageConverter';
import type { FileWithPreview } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const ResizeImage: React.FC = () => {
  const { t } = useTranslation();
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainAspect, setMaintainAspect] = useState(true);

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      options.setProgress((i / files.length) * 50);
      
      const blob = await resizeImage(
        file.file, 
        width || 0, 
        height || 0, 
        maintainAspect
      );
      file.result = blob;
      file.resultUrl = URL.createObjectURL(blob);
      
      options.setProgress(((i + 1) / files.length) * 100);
    }
  };

  const renderOptions = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="width">{t('tools.resizeImage.width')}</Label>
          <Input
            id="width"
            type="number"
            value={width || ''}
            onChange={(e) => setWidth(Number(e.target.value))}
            placeholder="Auto"
          />
        </div>
        <div>
          <Label htmlFor="height">{t('tools.resizeImage.height')}</Label>
          <Input
            id="height"
            type="number"
            value={height || ''}
            onChange={(e) => setHeight(Number(e.target.value))}
            placeholder="Auto"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="aspect"
          checked={maintainAspect}
          onCheckedChange={(c) => setMaintainAspect(c as boolean)}
        />
        <Label htmlFor="aspect" className="cursor-pointer">
          {t('tools.resizeImage.maintainAspect')}
        </Label>
      </div>
    </div>
  );

  return (
    <ToolLayout
      toolId="resize-image"
      title={t('tools.resizeImage.title')}
      description={t('tools.resizeImage.description')}
      seoTitle={t('tools.resizeImage.seoTitle')}
      seoDescription={t('tools.resizeImage.seoDescription')}
      accept="image/*"
      multiple={false}
      maxFiles={1}
      renderOptions={renderOptions}
      onConvert={handleConvert}
      keywords={['resize image', 'image resizer', 'resize photo', 'online image resize']}
    />
  );
};

export default ResizeImage;
