import { IsEnum, IsNotEmpty } from 'class-validator';
import { TransitionAction } from '../../domain/enums/transition-action.enum';

export class TransitionRequestDto {
  @IsNotEmpty({ message: 'El campo "action" es obligatorio.' })
  @IsEnum(TransitionAction, {
    message: `La acción debe ser una de: ${Object.values(TransitionAction).join(', ')}.`,
  })
  action!: TransitionAction;
}
