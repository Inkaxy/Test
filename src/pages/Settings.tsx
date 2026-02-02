import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function Settings() {
  const { t, i18n } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.general')}</p>
      </div>
      
      {/* Language settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>{t('settings.selectLanguage')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={i18n.language}
            onValueChange={(value) => i18n.changeLanguage(value)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Label
              htmlFor="nb"
              className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="nb" id="nb" />
              <span className="text-2xl">🇳🇴</span>
              <div>
                <p className="font-medium">Norsk</p>
                <p className="text-sm text-muted-foreground">Norwegian</p>
              </div>
            </Label>
            <Label
              htmlFor="en"
              className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="en" id="en" />
              <span className="text-2xl">🇬🇧</span>
              <div>
                <p className="font-medium">English</p>
                <p className="text-sm text-muted-foreground">English</p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
