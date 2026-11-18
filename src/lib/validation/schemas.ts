import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/modules/currency/constants";

export const localeSchema = z.enum(["fr", "en", "ar"]);
export const cabinClassSchema = z.enum([
  "ECONOMY",
  "PREMIUM_ECONOMY",
  "BUSINESS",
  "FIRST",
]);
export const tripTypeSchema = z.enum(["ONE_WAY", "ROUND_TRIP", "MULTI_CITY"]);
export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

export const iataSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Code IATA invalide (3 lettres).");

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (AAAA-MM-JJ).");

export const legSchema = z.object({
  origin: iataSchema,
  destination: iataSchema,
  departureDate: isoDateSchema,
});

export const searchSchema = z
  .object({
    origin: iataSchema,
    destination: iataSchema,
    departureDate: isoDateSchema,
    returnDate: isoDateSchema.optional().nullable(),
    tripType: tripTypeSchema.default("ONE_WAY"),
    adults: z.coerce.number().int().min(1).max(9).default(1),
    children: z.coerce.number().int().min(0).max(8).default(0),
    infants: z.coerce.number().int().min(0).max(4).default(0),
    cabinClass: cabinClassSchema.default("ECONOMY"),
    currency: currencySchema.default("TND"),
    legs: z.array(legSchema).max(4).optional(),
  })
  .refine((data) => data.origin !== data.destination, {
    message: "L'aéroport de départ et d'arrivée doivent être différents.",
    path: ["destination"],
  })
  .refine((data) => data.tripType !== "ROUND_TRIP" || Boolean(data.returnDate), {
    message: "Une date de retour est requise pour un aller-retour.",
    path: ["returnDate"],
  })
  .refine(
    (data) =>
      !data.returnDate || new Date(data.returnDate) >= new Date(data.departureDate),
    {
      message: "La date de retour doit être après la date de départ.",
      path: ["returnDate"],
    },
  )
  .refine(
    (data) => data.infants <= data.adults,
    {
      message: "Un infant doit être accompagné d'un adulte.",
      path: ["infants"],
    },
  );

export type SearchInput = z.infer<typeof searchSchema>;

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est trop court.").max(60),
  lastName: z.string().trim().min(2, "Le nom est trop court.").max(60),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre."),
  preferredLanguage: localeSchema.default("fr"),
  preferredCurrency: currencySchema.default("TND"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "Jeton invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre."),
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  preferredLanguage: localeSchema,
  preferredCurrency: currencySchema,
  preferredAirlines: z.array(z.string().trim().max(3)).max(10).optional(),
  maxStops: z.coerce.number().int().min(0).max(3).optional().nullable(),
  preferredCabin: cabinClassSchema.optional().nullable(),
  emailNotifications: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis."),
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères.")
    .max(128)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre."),
});

export const alertSchema = z.object({
  origin: iataSchema,
  destination: iataSchema,
  departureDate: isoDateSchema,
  returnDate: isoDateSchema.optional().nullable(),
  targetPrice: z.coerce.number().positive("Le prix cible doit être positif.").max(100000),
  currency: currencySchema.default("TND"),
});

export const alertUpdateSchema = z.object({
  targetPrice: z.coerce.number().positive().max(100000).optional(),
  currency: currencySchema.optional(),
  enabled: z.boolean().optional(),
  departureDate: isoDateSchema.optional(),
  returnDate: isoDateSchema.optional().nullable(),
});

export const aiSearchSchema = z.object({
  text: z.string().trim().min(5, "Décrivez votre voyage en quelques mots.").max(600),
});

export const aiAssistantSchema = z.object({
  message: z.string().trim().min(2).max(600),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(10)
    .optional(),
  locale: localeSchema.default("fr"),
});

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  locale: localeSchema.default("fr"),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export const providerUpdateSchema = z.object({
  enabled: z.boolean(),
});
