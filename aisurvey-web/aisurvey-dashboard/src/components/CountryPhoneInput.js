import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
    Divider,
    InputAdornment,
    List,
    ListItemButton,
    ListItemText,
    Popover,
    TextField,
    Typography
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { countries, getFlagEmoji } from '../data/countries';

export default function CountryPhoneInput({
    label,
    required,
    value,
    onValueChange,
    country,
    onCountryChange,
    error,
    helperText
}) {
    const [anchorEl, setAnchorEl] = useState(null);
    const [search, setSearch] = useState('');

    const open = Boolean(anchorEl);

    // E.164 standardına göre bir telefon numarası en fazla 15 rakam olabilir;
    // bu sınırdan ülke kodunun uzunluğu düşülerek ulusal numara için üst sınır elde edilir.
    const maxNationalLength = Math.max(15 - String(country.dialCode || '').length, 4);

    const filteredCountries = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return countries;

        const numericQuery = query.replace(/[^\d]/g, '');

        return countries.filter((c) => {
            const nameMatch = c.name.toLowerCase().includes(query);
            const dialCodeMatch = numericQuery && c.dialCode.includes(numericQuery);
            return nameMatch || dialCodeMatch;
        });
    }, [search]);

    const handleOpen = (e) => {
        setAnchorEl(e.currentTarget);
        setSearch('');
    };

    const handleClose = () => {
        setAnchorEl(null);
        setSearch('');
    };

    const handleSelect = (selectedCountry) => {
        onCountryChange(selectedCountry);
        handleClose();
    };

    return (
        <>
            <TextField
                required={required}
                fullWidth
                label={label}
                value={value}
                onChange={(e) => {
                    const digitsAndSpaces = e.target.value.replace(/[^\d\s]/g, '');
                    const digitsOnly = digitsAndSpaces.replace(/\s/g, '');
                    if (digitsOnly.length > maxNationalLength) return;
                    onValueChange(digitsAndSpaces);
                }}
                error={error}
                helperText={helperText}
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <Button
                                    onClick={handleOpen}
                                    sx={{ minWidth: 'auto', textTransform: 'none', px: 1, color: 'text.primary' }}
                                    endIcon={<ArrowDropDownIcon />}
                                >
                                    <span style={{ fontSize: '1.2rem', marginRight: 4 }}>
                                        {getFlagEmoji(country.iso2)}
                                    </span>
                                    +{country.dialCode}
                                </Button>
                                <Divider orientation="vertical" flexItem sx={{ ml: 1 }} />
                            </InputAdornment>
                        )
                    }
                }}
            />
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Box sx={{ width: 320, p: 1 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        placeholder="Ülke veya kod ara (örn. +90)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </Box>
                <List sx={{ width: 320, maxHeight: 320, overflowY: 'auto', pt: 0 }}>
                    {filteredCountries.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="textSecondary">
                                Sonuç bulunamadı
                            </Typography>
                        </Box>
                    ) : (
                        filteredCountries.map((c) => (
                            <ListItemButton
                                key={c.iso2}
                                selected={c.iso2 === country.iso2}
                                onClick={() => handleSelect(c)}
                            >
                                <span style={{ fontSize: '1.2rem', marginRight: 10 }}>
                                    {getFlagEmoji(c.iso2)}
                                </span>
                                <ListItemText primary={c.name} />
                                <Typography variant="body2" color="textSecondary">
                                    +{c.dialCode}
                                </Typography>
                            </ListItemButton>
                        ))
                    )}
                </List>
            </Popover>
        </>
    );
}