import { describe, it, expect, vi, afterEach } from "vitest";
import { offlineRequest, offlineRecommend, offlineGoalSkills } from "./offline.js";
import { api } from "./api.js";
afterEach(() => vi.unstubAllGlobals());

const beginner = { goal:"Learn data science", current_skills:[],difficulty:"Beginner",hours_per_week:4,completed_courses:[],mode:"goal" };

describe("SkillPath browser demo fallback", () => {
  it("loads resources and the catalogue without the Python API", async () => {
    const meta = await offlineRequest("/meta");
    expect(meta.engine_mode).toBe("browser-demo");
    expect(meta.resource_count).toBeGreaterThan(20);
    const catalog = await offlineRequest("/catalog?q=python");
    expect(catalog.resources.length).toBeGreaterThan(1);
    expect(catalog.resources.every(r => (r.title + " " + r.description + " " + r.skills.join(" ")).toLowerCase().includes("python"))).toBe(true);
  });
  it("enforces beginner-level and prerequisite guardrails", () => {
    const result = offlineRecommend(beginner,7);
    expect(result.path.length).toBeGreaterThan(0);
    const mastered = new Set();
    for (const resource of result.path) {
      expect(resource.difficulty).toBe("Beginner");
      expect(resource.prerequisites.every(s => mastered.has(s))).toBe(true);
      resource.skills.forEach(s => mastered.add(s));
    }
    expect(result.path.every(r=>r.end_week>=r.start_week)).toBe(true);
  });
  it("provides stable goals and a bounded evaluation lab", async () => {
    expect(offlineGoalSkills("Build web applications")).toContain("react");
    const report = await offlineRequest("/evaluation");
    expect(report.engine_mode).toBe("browser-demo");
    expect(report.ablation).toHaveLength(5);
    for(const score of Object.values(report.metrics)) expect(score).toBeGreaterThanOrEqual(0);
    for(const score of Object.values(report.metrics)) expect(score).toBeLessThanOrEqual(1);
    expect(report.experiments.samples).toBe(250);
  });
  it("accepts the same POST path payload shape as FastAPI", async ()=>{
    const result = await offlineRequest("/recommend",{method:"POST",body:JSON.stringify({profile:beginner,limit:4})});
    expect(result.path.length).toBeGreaterThan(0);
    expect(result.path.length).toBeLessThanOrEqual(4);
    expect(result.engine_mode).toBe("browser-demo");
  });
  it("enforces relevant Signals and Systems recommendations with the public catalogue", async ()=>{
    const meta = await offlineRequest("/meta");
    const profile = { ...beginner, goal:"Study Signals and Systems", difficulty:"Beginner" };
    const result = await offlineRequest("/recommend", {method:"POST",body:JSON.stringify({profile,limit:5})});
    if (meta.is_public_catalog) {
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.path.every(r => /signal|fourier|convolution|laplace|lti|dsp/i.test(r.title+" "+r.skills.join(" ")))).toBe(true);
      expect(result.path.every(r => r.difficulty === "Beginner")).toBe(true);
    } else expect(result.path).toHaveLength(0);
  });
  it("uses browser fallback when the fetch fails",async ()=>{
    vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("API unavailable")));
    const result = await api("/meta");
    expect(result.engine_mode).toBe("browser-demo");
  });
  it("does not disguise an HTTP validation error as an offline result",async ()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({
      ok:false,status:422,json:async()=>({detail:"Invalid difficulty"})
    }));
    await expect(api("/recommend",{method:"POST",body:"{}"})).rejects.toThrow("Invalid difficulty");
  });
});
