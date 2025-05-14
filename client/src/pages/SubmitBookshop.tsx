import { FC } from "react";
import BookshopSubmissionForm from "../components/BookshopSubmissionForm";

const SubmitBookshop: FC = () => {
  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-3xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">
          Submit a Bookshop
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Help us grow our directory of independent bookshops. Submit a new bookshop or suggest changes to an existing one.
        </p>
        <BookshopSubmissionForm />
      </div>
    </div>
  );
};

export default SubmitBookshop;