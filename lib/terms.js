// Central place for per-business-type wording and the signup list.
// Tweak a line here and it updates everywhere that imports it.

export const BUSINESS_TYPES = [
  { value: "barbershop", label: "Barbershop" },
  { value: "hair_salon", label: "Hair salon" },
  { value: "nails", label: "Nail salon" },
  { value: "waxing", label: "Waxing studio" },
  { value: "lashes_brows", label: "Lash & brow studio" },
  { value: "spa", label: "Spa / massage" },
  { value: "skincare", label: "Skincare / facials" },
  { value: "tattoo", label: "Tattoo & piercing" },
  { value: "tanning", label: "Tanning / spray tan" },
  { value: "pet_grooming", label: "Pet grooming" },
  { value: "personal_trainer", label: "Personal trainer" },
  { value: "tutor", label: "Tutor / lessons" },
  { value: "photographer", label: "Photographer" },
  { value: "other", label: "Other appointment business" },
];

// Wording for every type — including ones no longer offered at signup,
// so existing shops keep reading correctly.
const TERMS = {
  barbershop:        { staff: "barber",       staffPlural: "barbers" },
  hair_salon:        { staff: "stylist",      staffPlural: "stylists" },
  nails:             { staff: "nail tech",    staffPlural: "nail techs" },
  waxing:            { staff: "specialist",   staffPlural: "specialists" },
  lashes_brows:      { staff: "specialist",   staffPlural: "specialists" },
  spa:               { staff: "therapist",    staffPlural: "therapists" },
  skincare:          { staff: "esthetician",  staffPlural: "estheticians" },
  tattoo:            { staff: "artist",       staffPlural: "artists" },
  tanning:           { staff: "specialist",   staffPlural: "specialists" },
  pet_grooming:      { staff: "groomer",      staffPlural: "groomers" },
  personal_trainer:  { staff: "trainer",      staffPlural: "trainers" },
  tutor:             { staff: "tutor",        staffPlural: "tutors" },
  photographer:      { staff: "photographer", staffPlural: "photographers" },
  other:             { staff: "team member",  staffPlural: "team members" },
  // retired from the signup list, kept so existing shops still read right
  medspa:            { staff: "provider",     staffPlural: "providers" },
  wellness:          { staff: "practitioner", staffPlural: "practitioners" },
  auto:              { staff: "specialist",   staffPlural: "specialists" },
  home_services:     { staff: "pro",          staffPlural: "pros" },
};

const DEFAULT = { staff: "team member", staffPlural: "team members" };

export function terms(businessType) {
  return TERMS[businessType] || DEFAULT;
}

export function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}