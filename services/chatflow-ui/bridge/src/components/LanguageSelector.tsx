// src/layout/LanguageSelector.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Option } from '@mui/joy';
import LanguageIcon from '@mui/icons-material/Language';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zh-Hant', name: '繁體中文' },
    { code: 'zh-Hans', name: '简体中文' },
  ];

  const handleLanguageChange = (
    _event: React.SyntheticEvent | null,
    newValue: string | null
  ) => {
    if (newValue && newValue !== i18n.language) {
      i18n.changeLanguage(newValue);
    }
  };

  return (
    <Select
      value={i18n.language}
      onChange={handleLanguageChange}
      startDecorator={<LanguageIcon />}
      size="sm"
      variant="outlined"
      sx={{
        minWidth: 120,
      }}
    >
      {languages.map((language) => (
        <Option key={language.code} value={language.code}>
          {language.name}
        </Option>
      ))}
    </Select>
  );
};

export default LanguageSelector;