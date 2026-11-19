import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio.' })
  @MaxLength(500, { message: 'El título no puede superar los 500 caracteres.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  description!: string;
}
