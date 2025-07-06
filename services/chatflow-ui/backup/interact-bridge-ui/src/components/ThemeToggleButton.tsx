// src/layout/ThemeToggleButton.tsx
import { useColorScheme } from '@mui/joy/styles';
import { IconButton, Tooltip } from '@mui/joy';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

const ThemeToggleButton = () => {
  const { mode, setMode } = useColorScheme();

  const handleThemeToggle = () => {
    if (mode === 'light') {
      setMode('dark');
    } else if (mode === 'dark') {
      setMode('system');
    } else {
      setMode('light');
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      default:
        return <SettingsBrightnessIcon />;
    }
  };

  const getTooltipText = () => {
    switch (mode) {
      case 'light':
        return 'Switch to dark mode';
      case 'dark':
        return 'Switch to system mode';
      default:
        return 'Switch to light mode';
    }
  };

  return (
    <Tooltip title={getTooltipText()} placement="bottom">
      <IconButton
        variant="outlined"
        size="sm"
        onClick={handleThemeToggle}
        sx={{
          borderRadius: 'sm',
        }}
      >
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggleButton;