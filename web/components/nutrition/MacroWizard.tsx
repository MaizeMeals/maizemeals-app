"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import {
  saveMacroTargets,
  type UserMacroGoals,
} from "@/app/actions/macro-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  calculateMacroTargets,
  type ActivityLevel,
  type BiologicalSex,
  type MacroGoalType,
  type MacroProfileInput,
  type MacroSummary,
} from "@/lib/nutrition";
import { appPrimaryButtonClassName } from "@/lib/button-styles";
import { toast } from "@/lib/toast";

const ACTIVITY_OPTIONS: Array<{
  value: ActivityLevel;
  label: string;
  description: string;
}> = [
  { value: "SEDENTARY", label: "Mostly sedentary", description: "Desk-based day and little structured exercise" },
  { value: "LIGHT", label: "Lightly active", description: "Exercise or lots of walking 1–3 days a week" },
  { value: "MODERATE", label: "Moderately active", description: "Exercise 3–5 days a week" },
  { value: "VERY_ACTIVE", label: "Very active", description: "Hard exercise 6–7 days a week" },
  { value: "ATHLETE", label: "Athlete / physical job", description: "Intense training or highly physical work" },
];

const GOAL_OPTIONS: Array<{
  value: MacroGoalType;
  label: string;
  description: string;
}> = [
  { value: "CUT", label: "Cut", description: "A 20% calorie deficit while preserving protein" },
  { value: "MAINTAIN", label: "Maintain", description: "Stay near your estimated daily energy use" },
  { value: "BULK", label: "Bulk", description: "A 15% surplus with maximum protein priority" },
];

type EstimatorFormState = {
  heightFeet: string;
  heightInches: string;
  weightLb: string;
  age: string;
  activityLevel: ActivityLevel;
  biologicalSex: BiologicalSex;
  goalType: MacroGoalType;
};

type TargetFormState = Record<keyof MacroSummary, string>;

function initialEstimatorInput(settings: UserMacroGoals | null): EstimatorFormState {
  return {
    heightFeet: "5",
    heightInches: "9",
    weightLb: "154",
    age: "20",
    activityLevel: "MODERATE",
    biologicalSex: "UNSPECIFIED",
    goalType: (settings?.goal_type as MacroGoalType | undefined) ?? "MAINTAIN",
  };
}

function estimatorValues(input: EstimatorFormState): MacroProfileInput {
  return {
    ...input,
    heightCm: (Number(input.heightFeet) * 12 + Number(input.heightInches)) * 2.54,
    weightKg: Number(input.weightLb) / 2.2046226218,
    age: Number(input.age),
  };
}

function targetFormValues(targets: MacroSummary): TargetFormState {
  return {
    calories: String(targets.calories),
    protein: String(targets.protein),
    carbs: String(targets.carbs),
    fat: String(targets.fat),
  };
}

function numericTargetValues(targets: TargetFormState): MacroSummary {
  return {
    calories: Number(targets.calories),
    protein: Number(targets.protein),
    carbs: Number(targets.carbs),
    fat: Number(targets.fat),
  };
}

function initialTargets(
  settings: UserMacroGoals | null,
  estimatorInput: EstimatorFormState,
): TargetFormState {
  if (settings?.setup_completed) {
    return targetFormValues({
      calories: Number(settings.target_calories),
      protein: Number(settings.target_protein_g),
      carbs: Number(settings.target_carbs_g),
      fat: Number(settings.target_fat_g),
    });
  }
  return targetFormValues(calculateMacroTargets(estimatorValues(estimatorInput)).goals);
}

export function MacroWizard({
  initialSettings,
  onSaved,
  onCancel,
}: {
  initialSettings: UserMacroGoals | null;
  onSaved: (settings: UserMacroGoals) => void;
  onCancel?: () => void;
}) {
  const { track } = useAnalytics();
  const [input, setInput] = useState<EstimatorFormState>(() =>
    initialEstimatorInput(initialSettings),
  );
  const [targets, setTargets] = useState<TargetFormState>(() =>
    initialTargets(initialSettings, initialEstimatorInput(initialSettings)),
  );
  const [step, setStep] = useState(initialSettings?.setup_completed ? 3 : 0);
  const [saving, setSaving] = useState(false);
  const calculated = useMemo(
    () => calculateMacroTargets(estimatorValues(input)),
    [input],
  );
  const numericTargets = useMemo(() => numericTargetValues(targets), [targets]);

  const basicsValid =
    input.heightFeet.trim() !== "" &&
    input.heightInches.trim() !== "" &&
    input.weightLb.trim() !== "" &&
    input.age.trim() !== "" &&
    Number.isInteger(Number(input.heightFeet)) &&
    Number(input.heightInches) >= 0 && Number(input.heightInches) < 12 &&
    Number(input.heightFeet) * 12 + Number(input.heightInches) >= 36 &&
    Number(input.heightFeet) * 12 + Number(input.heightInches) <= 102 &&
    Number(input.weightLb) >= 66 && Number(input.weightLb) <= 880 &&
    Number.isInteger(Number(input.age)) && Number(input.age) >= 13 && Number(input.age) <= 120;
  const targetsValid =
    Object.values(targets).every((value) => value.trim() !== "") &&
    Number.isInteger(numericTargets.calories) &&
    numericTargets.calories > 0 &&
    numericTargets.calories <= 10000 &&
    Number.isFinite(numericTargets.protein) &&
    numericTargets.protein >= 0 &&
    numericTargets.protein <= 1000 &&
    Number.isFinite(numericTargets.carbs) &&
    numericTargets.carbs >= 0 &&
    numericTargets.carbs <= 2000 &&
    Number.isFinite(numericTargets.fat) &&
    numericTargets.fat >= 0 &&
    numericTargets.fat <= 1000;

  const continueWizard = () => {
    if (step === 0 && !basicsValid) {
      toast.error("Check your height, weight, and age.");
      return;
    }
    if (step === 2) setTargets(targetFormValues(calculated.goals));
    setStep((current) => Math.min(3, current + 1));
  };

  const save = async () => {
    if (!targetsValid) {
      toast.error("Check your calorie and macro targets.");
      return;
    }
    setSaving(true);
    const result = await saveMacroTargets({
      goals: numericTargets,
      goalType: input.goalType,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    // The event contains no estimator inputs or target values.
    track("maizemacros_targets_saved");
    toast.success("Your MaizeMacros targets are saved.");
    onSaved(result.data);
  };

  return (
    <div className="ph-no-capture min-h-screen bg-muted/20 px-4 pb-16 pt-24 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-maize">MaizeMacros targets</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
              {step === 3 ? "Set your daily targets" : "Estimate your daily targets"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === 3
                ? "The estimate is only a starting point. Adjust every target to fit your needs."
                : "Use the private estimator, then review and customize its suggestions."}
            </p>
          </div>
          {onCancel ? (
            <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel target editing">
              <X className="h-5 w-5" />
            </Button>
          ) : null}
        </div>

        <div className="mb-6 flex gap-2" aria-label={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full ${index <= step ? "bg-maize" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          {step === 0 ? (
            <div>
              <h2 className="text-xl font-black">Your basics</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These details are used only to calculate an estimate.
              </p>
              <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm text-foreground">
                  <span className="font-bold">Private by design.</span>{" "}
                  Your height, weight, age, activity, and sex stay in this form. We do not
                  save them or send them to analytics.
                </p>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Height</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="3"
                        max="8"
                        step="1"
                        value={input.heightFeet}
                        onChange={(event) =>
                          setInput((current) => ({ ...current, heightFeet: event.target.value }))
                        }
                        className="pr-9"
                        aria-label="Height in feet"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ft</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="11.9"
                        step="0.1"
                        value={input.heightInches}
                        onChange={(event) =>
                          setInput((current) => ({ ...current, heightInches: event.target.value }))
                        }
                        className="pr-9"
                        aria-label="Additional height in inches"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">in</span>
                    </div>
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Weight</span>
                  <div className="relative">
                    <Input
                      type="number"
                      min="66"
                      max="880"
                      step="0.1"
                      value={input.weightLb}
                      onChange={(event) =>
                        setInput((current) => ({ ...current, weightLb: event.target.value }))
                      }
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">lb</span>
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Age</span>
                  <Input
                    type="number"
                    min="13"
                    max="120"
                    step="1"
                    value={input.age}
                    onChange={(event) =>
                      setInput((current) => ({ ...current, age: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Sex used for the estimate</span>
                  <select
                    value={input.biologicalSex}
                    onChange={(event) =>
                      setInput((current) => ({
                        ...current,
                        biologicalSex: event.target.value as BiologicalSex,
                      }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                  >
                    <option value="UNSPECIFIED">Use neutral estimate</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                </label>
              </div>
            </div>
          ) : step === 1 ? (
            <div>
              <h2 className="text-xl font-black">How active are you?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose the closest average week. This choice is not saved.
              </p>
              <div className="mt-6 space-y-3">
                {ACTIVITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setInput((current) => ({ ...current, activityLevel: option.value }))
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      input.activityLevel === option.value
                        ? "border-maize bg-maize/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-bold">{option.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : step === 2 ? (
            <div>
              <h2 className="text-xl font-black">What is your goal?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This adjusts your estimate. You can edit every result on the next step.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setInput((current) => ({ ...current, goalType: option.value }))
                    }
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      input.goalType === option.value
                        ? "border-maize bg-maize/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Target className="mb-3 h-5 w-5 text-maize" />
                    <span className="font-black">{option.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-muted/60 p-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">Estimated TDEE</span>
                  <span className="font-black tabular-nums">{calculated.estimatedTdee} Calories/day</span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Calories", calculated.goals.calories, ""],
                    ["Protein", calculated.goals.protein, "g"],
                    ["Carbs", calculated.goals.carbs, "g"],
                    ["Fat", calculated.goals.fat, "g"],
                  ].map(([label, value, unit]) => (
                    <div key={label}>
                      <div className="text-lg font-black tabular-nums">{value}{unit}</div>
                      <div className="text-[11px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-black">Make the targets yours</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Change any value now or return here from the tracker whenever you want.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {([
                  ["calories", "Calories", "Cal", 1, 10000, 1],
                  ["protein", "Protein", "g", 0, 1000, 0.1],
                  ["carbs", "Carbohydrates", "g", 0, 2000, 0.1],
                  ["fat", "Fat", "g", 0, 1000, 0.1],
                ] as const).map(([key, label, unit, min, max, increment]) => (
                  <label key={key} className="space-y-2">
                    <span className="text-sm font-semibold">{label}</span>
                    <div className="relative">
                      <Input
                        type="number"
                        min={min}
                        max={max}
                        step={increment}
                        value={targets[key]}
                        onChange={(event) =>
                          setTargets((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        className="pr-14"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-sm text-muted-foreground">
                  We save only these four targets and your selected goal. Estimator details
                  are never stored.
                </p>
                {input.goalType === "BULK" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Bulk also sets Protein Priority to 100 in Smart Preferences.
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 gap-2"
                  disabled={saving}
                  onClick={() => setStep(0)}
                >
                  <RotateCcw className="h-4 w-4" /> Recalculate estimate
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-between">
          <Button
            variant="outline"
            disabled={step === 0 || saving}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < 3 ? (
            <Button
              disabled={(step === 0 && !basicsValid) || saving}
              onClick={continueWizard}
              className={appPrimaryButtonClassName}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              disabled={saving || !targetsValid}
              onClick={() => void save()}
              className={appPrimaryButtonClassName}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving…" : "Save targets"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
