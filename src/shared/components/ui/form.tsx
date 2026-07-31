import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

const Form = FormProvider;

const FormFieldContext = React.createContext<{
  name?: FieldPath<FieldValues>;
}>({});

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider
      value={{ name: props.name as FieldPath<FieldValues> }}
    >
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

function FormItem({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`space-y-2 ${className}`} {...props} />;
}

function FormControl({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

function FormMessage({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const fieldContext = React.useContext(FormFieldContext);
  const {
    formState,
    getFieldState,
  } = useFormContext();

  const error = fieldContext.name
    ? getFieldState(fieldContext.name, formState).error
    : null;
  const message = typeof error?.message === "string" ? error.message : null;

  if (!message) return null;

  return (
    <p
      className={`text-sm font-medium text-destructive ${className}`}
      {...props}
    >
      {message}
    </p>
  );
}

export { Form, FormControl, FormField, FormItem, FormMessage };
