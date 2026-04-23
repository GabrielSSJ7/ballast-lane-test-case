import { z } from "zod";

export const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  genre: z.string().min(1, "Genre is required"),
  isbn: z.string().min(1, "ISBN is required"),
  total_copies: z.coerce.number().int().min(0, "Must be 0 or more"),
});

export type BookFormData = z.infer<typeof bookSchema>;
