type UseCaseGridProps = {
  useCases: string[];
};

export function UseCaseGrid({ useCases }: UseCaseGridProps) {
  return (
    <div className="use-case-grid">
      {useCases.map((useCase) => (
        <article className="use-case-card" key={useCase}>
          <span>{useCase}</span>
        </article>
      ))}
    </div>
  );
}
