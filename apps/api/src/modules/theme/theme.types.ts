import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class ThemeTemplateInfo {
  @Field()
  key: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  primaryColor: string;

  @Field()
  accentColor: string;

  @Field()
  backgroundColor: string;

  @Field()
  headingFont: string;

  @Field({ description: 'Page structure key: classic, editorial, parallax, catalog, playful or minimal' })
  layout: string;

  @Field()
  layoutName: string;

  @Field()
  layoutDescription: string;
}

@InputType()
export class CreateThemeFromTemplateInput {
  @Field()
  @IsString()
  @MaxLength(40)
  templateKey: string;
}

@InputType()
export class GenerateThemeInput {
  @Field({ description: 'What the seller sells, in their own words' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;
}

@InputType()
export class ThemeIdInput {
  @Field(() => ID)
  @IsUUID()
  themeId: string;
}

@InputType()
export class UpdateThemeInput {
  @Field(() => ID)
  @IsUUID()
  themeId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @Field(() => GraphQLJSON, { description: 'Full store layout; validated against the theme schema' })
  @IsObject()
  layout: Record<string, unknown>;
}

@InputType()
export class CreateThemePreviewInput extends ThemeIdInput {
  @Field({ nullable: true, description: 'Lets the editor show unsaved changes through this preview' })
  @IsOptional()
  @IsBoolean()
  withDraft?: boolean;
}

@InputType()
export class ThemePreviewDraftInput {
  @Field(() => ID)
  @IsUUID()
  themeId: string;

  @Field(() => ID)
  @IsUUID()
  draftId: string;

  @Field(() => GraphQLJSON)
  @IsObject()
  layout: Record<string, unknown>;
}

@ObjectType()
export class ThemePreview {
  @Field()
  token: string;

  @Field(() => ID, { nullable: true })
  draftId: string | null;

  @Field(() => Date)
  expiresAt: Date;
}
