// Ülke listesi ve telefon kodları libphonenumber-js kütüphanesinden (Google'ın
// libphonenumber verisine dayanır) alınır; bu, elle tutulan bir listeden daha
// güncel ve hatasız kalır. Ülke adları tarayıcının yerleşik Intl.DisplayNames
// API'si ile Türkçe üretilir; desteklenmeyen bir ortamda İngilizce/ISO koduna
// geri düşer.
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

const createRegionNames = () => {
    try {
        return new Intl.DisplayNames(['tr'], { type: 'region' });
    } catch (e) {
        try {
            return new Intl.DisplayNames(['en'], { type: 'region' });
        } catch (e2) {
            return null;
        }
    }
};

const regionNames = createRegionNames();

export const countries = getCountries()
    .map((iso2) => ({
        iso2,
        dialCode: getCountryCallingCode(iso2),
        name: (regionNames && regionNames.of(iso2)) || iso2
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

export const defaultCountry = countries.find((c) => c.iso2 === 'TR') || countries[0];

export const getFlagEmoji = (iso2) =>
    iso2
        .toUpperCase()
        .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));