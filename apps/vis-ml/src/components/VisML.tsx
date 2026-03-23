"use client";

import { useEffect } from "react";

export default function VisML() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    import("@/lib/vis-ml").then((mod) => {
      cleanup = mod.init();
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <main>
      <section className="intro">
        <h1 className="intro-header">Linear Regression</h1>
        <p className="intro-description">
          A visual introduction to linear regression and the perceptron
        </p>
      </section>
      <section id="scrolly">
        <article>
          <div className="step" data-step="1">
            <p>
              I&apos;m currently looking for a new job and after interviewing at
              a few places I finally got my first offer! Yay!
            </p>
            <p>
              But after looking at the salary, my first thought was{" "}
              <span className="italics">
                &quot;Is this considered a good offer?&quot;
              </span>
            </p>
          </div>
          <div className="step" data-step="2">
            <p>
              It&apos;s not easy to tell without a frame of reference. So I ask
              my friends who are in the same field and ended up with a few data
              points:
            </p>
          </div>
          <div className="step" data-step="3">
            <p>
              We can see that there&apos;s a correlation between years of
              experience and how much a person is getting paid.
            </p>
            <p>
              One way to figure out whether the offer was good is to see if
              it&apos;s above or below the average for my years of experience
            </p>
          </div>
          <div className="step" data-step="4">
            <p>
              How about we create a formula which looks at the average salary per
              year of experience?
            </p>
          </div>
          <div className="step" data-step="5">
            <p>Here&apos;s what our formula can look like:</p>
            <p>
              This is a simple predictive model that takes an{" "}
              <strong>input (years of experience)</strong>, does a{" "}
              <strong>calculation</strong> (multiplies it by the average salary
              per year of experience), and gives an{" "}
              <strong>output (predicted salary)</strong>
            </p>
          </div>
          <div className="step" data-step="6">
            <p>
              Calculating the prediction is simple multiplication. But before
              that, we needed to think about the{" "}
              <strong className="highlight-weight">weight</strong> we&apos;ll be
              multiplying by
            </p>
            <p>
              Here we started with an average, later we&apos;ll look at better
              algorithms that can scale as we get more inputs and more
              complicated models
            </p>
            <p>
              Finding the <strong className="highlight-weight">weight</strong>{" "}
              is the &quot;training&quot; stage. So whenever you hear of someone
              &quot;training&quot;, it just means finding the weights we use to
              calculate the prediction
            </p>
          </div>
          <div className="step" data-step="7">
            <p>
              Now, lets go back to our salary and see what we think we shouldve
              gotten paid. Let&apos;s say I have 4 years of experience, we can
              put this into our formula to check
            </p>
          </div>
          <div className="step" data-step="8">
            <p>
              Hmm does that look right? Now I&apos;m curious, is average really
              the best number to look at here? Let&apos;s plot out our data to
              find out
            </p>
          </div>
          <div className="step" data-step="9">
            <p>And plot the prediction line</p>
          </div>
          <div className="step" data-step="10">
            <p>
              This line doesn&apos;t look very accurate. But what does accuracy
              mean? One way of checking the how good of a job our model does is
              by measuring how &quot;off&quot; the predicted value is from true
              values
            </p>
          </div>
          <div className="step" data-step="11">
            <p>
              Here we can see the actual price value, the predicted price value,
              and the difference between them
            </p>
            <p>
              We call this our{" "}
              <strong className="highlight-error">&quot;Error&quot;</strong>.
            </p>
          </div>
          <div className="step" data-step="12">
            <p>
              Now that we defined our measuring stick for what makes a better
              model, let&apos;s experiment with a couple more weight values and
              compare them with our average pick:
            </p>
          </div>
          <div className="step" data-step="13">
            <p>
              Oh there&apos;s one thing we never realized! When you start your
              first job, your salary actually goes from 0 (when you&apos;re in
              school) to the tens of thousands
            </p>
            <p>Let&apos;s add this into our model as well:</p>
          </div>
          <div className="step" data-step="14">
            <p>
              In this context, we call it a{" "}
              <strong className="highlight-bias">&quot;bias&quot;</strong>
            </p>
          </div>
          <div className="step" data-step="14">
            <p>
              Let&apos;s try manually &quot;training&quot; our regression model,
              minimize the error by tweaking the weight and bias dials:
            </p>
          </div>
          <div className="step" data-step="15">
            <p>
              Congratulations on manually training your first regression model!
            </p>
            <p>
              Next we can learn how machines do it with an algorithm called
              &quot;Gradient Descent&quot;
            </p>
          </div>
        </article>

        <figure>
          <div className="offer hidden">
            <h1>Offer Letter</h1>
            <h4>$xxx,xxx</h4>
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
            <div className="line"></div>
          </div>
          <div className="table-container hidden">
            <div className="me-line hidden"></div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Years of experience</th>
                  <th>Salary</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
            <div className="plus-line">
              <div className="line-container">
                <div className="experience-line hidden">
                  <span className="total-value"></span>
                  average years of experience
                </div>
                <div className="salary-line hidden">
                  <span className="total-value"></span>
                  average salary
                </div>
              </div>
              <div className="total hidden">
                On average, you would get paid{" "}
                <span className="total-value"></span> per year of experience
              </div>
            </div>
          </div>
          <div className="formula-container hidden">
            <div className="input">
              <div className="visual">x</div>
              <div className="visual-description">(number of years)</div>
            </div>
            <div className="weight">
              <div className="visual">w</div>
              <div className="visual-description"></div>
            </div>
            <div className="bias hidden">
              <div className="visual">b</div>
              <div className="visual-description">0</div>
            </div>
            <div className="output">
              <div className="visual">y</div>
              <div className="visual-description">(predicted salary)</div>
            </div>
            <div className="test hidden">4 years</div>
          </div>
          <div className="chart-container hidden">
            <svg className="chart" width="600" height="400"></svg>
            <footer className="chart-controls">
              <div>
                <div className="chart-weight hidden">
                  <input
                    type="range"
                    id="weight"
                    name="weight"
                    min="0"
                    max="15000"
                    step="100"
                    defaultValue="0"
                  />
                  <label htmlFor="weight">
                    Weight: <span className="weight-text"></span>
                  </label>
                </div>
                <div className="chart-bias hidden">
                  <input
                    type="range"
                    id="bias"
                    name="bias"
                    min="0"
                    max="80000"
                    step="100"
                    defaultValue="0"
                  />
                  <label htmlFor="bias">
                    Bias: <span className="bias-text"></span>
                  </label>
                </div>
              </div>
              <div className="chart-error highlight-error hidden">
                Error: <span className="error-text"></span>
              </div>
            </footer>
          </div>
        </figure>
      </section>
    </main>
  );
}
